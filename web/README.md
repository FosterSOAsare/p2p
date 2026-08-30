# P2P Marketplace Escrow — Web Client

React + Vite + TypeScript front-end for the Group 2 P2P Marketplace Escrow project. Talks to the
[API server](../server) over REST. Buyers browse and buy, sellers list and fulfil, admins review
KYC and arbitrate disputes — all against a 6-state escrow (`created → funded → delivered → disbursed | disputed | cancelled`).

> Fiat (GHS) payments are **simulated**; the TRX crypto rail is **not built yet**. See [../FLOWS.md](../FLOWS.md)
> for every flow.

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

## SEO & page titles

Metadata lives in two places, and the split matters.

**`index.html`** is the static head. Vite serves this one file for every URL, so
these tags are what a scraper that does **not** run JavaScript sees for *every*
page — Facebook, WhatsApp, LinkedIn and Slack all fall in that group. It carries
the site-level title, description, Open Graph/Twitter card, `theme-color`, the
manifest link, and the `Organization` + `WebSite` JSON-LD.

**`features/shared/libs/seo.ts`** is the per-route table, applied at runtime by
`features/shared/ui/Seo.tsx` (mounted once in `AppProviders`, inside the router).
It rewrites the title, description, canonical, robots and card tags on every
navigation. Googlebot renders JS and reads these; the social scrapers do not.

> **Consequence:** a link to `/marketplace/<id>` shared into WhatsApp shows the
> *site* card, not the listing. Fixing that needs prerendering or SSR
> (`vite-plugin-prerender`, or moving the public routes behind a small
> pre-render step at deploy). Titles, canonicals and `robots` all work as-is.

### Adding a page

Add a row to `ROUTES` in `seo.ts` — pattern, title, description, and `index`.
Anything behind a login gets `index: false`; that is the default for an unmatched
path too, so a new private route is never accidentally indexable.

A page whose title depends on loaded data calls `useSeo()` with its own values
(see `ProductDetail`, `SellerProfile`). Call it **above** any early return —
hooks can't be conditional — and pass `null` while loading so the route default
holds. `useJsonLd(id, data)` does the same for structured data.

### Files that carry the public origin

`VITE_SITE_URL` drives every canonical and absolute `og:` URL at runtime, but
four files hardcode it and must be changed together when the domain is settled:

- `.env` / `.env.example` — `VITE_SITE_URL`
- `index.html` — canonical, `og:url`, `og:image`, JSON-LD `@id`s
- `public/robots.txt` — the `Sitemap:` line
- `public/sitemap.xml` — every `<loc>`

`public/sitemap.xml` lists **static routes only**. Listings and seller profiles
are database rows, so a complete sitemap has to be generated at deploy time
against the API; until then they are discovered by crawling from `/marketplace`.

### The social card image

`public/og-cover.svg` is the source artwork. Scrapers can't read SVG, so it must
be exported to `public/og-cover.png` at 1200×630:

```bash
npm run og:image     # npx svgexport — downloads a headless browser on first run
```

**Until that is run, `og-cover.png` does not exist and shared links show no
image.** Everything else works without it.

## Status

Order lifecycle, wallet, dashboards, and the admin console (KYC · disputes · users · deals) are wired to
the real API. Known gaps: **deal messaging** is a UI shell (`MessageThread` is local-state only — the
`/api/messages` backend exists but isn't wired), the **TRX crypto rail** and **real payments** are not built,
and the homepage's featured/metrics sections are still mock. Full breakdown in [../FLOWS.md](../FLOWS.md).
