# VeriTrust — Mobile App

The **Expo (React Native)** client for VeriTrust — the P2P Marketplace & Escrow
project (Group 2, KNUST). It talks to the same [API server](../server) as the
[web client](../web): buyers browse and buy, sellers list and fulfil, and both
sides run deals through a 6-state escrow (`created → funded → delivered →
disbursed | disputed | cancelled`).

> Fiat (GHS) payments are **simulated**; the TRX crypto rail is **testnet-only**
> and partly in progress. See [../FLOWS.md](../FLOWS.md) for every flow and
> [../README.md](../README.md) for the whole project.

## Tech stack

| Concern | Choice |
| --- | --- |
| Framework | Expo SDK **54** · React Native 0.81 · React 19.1 |
| Routing | Expo Router (file-based, under `src/app/`) |
| Server state | TanStack Query 5 (shared fetch client, transparent token refresh) |
| Forms | React Hook Form + Zod |
| Realtime | socket.io-client (chat + live deal notices) |
| Secure storage | `expo-secure-store` (JWT access + refresh tokens) |
| Media | `expo-image`, `expo-image-picker`, `expo-document-picker` (→ Cloudinary) |
| Icons / fonts | `lucide-react-native` · Manrope + Space Grotesk (Google Fonts) |

## Prerequisites

- **Node.js 20 LTS+** and npm
- The **[Expo Go](https://expo.dev/go)** app on a physical device, or an
  Android/iOS emulator/simulator
- The **[API server](../server) running** on the same WiFi (default port `8000`)

> ⚠️ **Expo SDK 54.** Read the exact versioned docs at
> <https://docs.expo.dev/versions/v54.0.0/> before using any Expo API — several
> APIs differ from newer SDKs (see [AGENTS.md](AGENTS.md)).

## Setup

```bash
cd mobile
npm install
npx expo start        # scan the QR with Expo Go, or press: a (Android) · i (iOS) · w (web)
```

| Script | What it does |
| --- | --- |
| `npm start` / `npx expo start` | Start the Expo dev server |
| `npm run android` | Open on an Android device/emulator |
| `npm run ios` | Open on an iOS simulator |
| `npm run web` | Run the app in a browser (react-native-web) |
| `npm run lint` | `expo lint` |

## Connecting to the API

The API base URL is resolved in
[`src/features/shared/data/config.ts`](src/features/shared/data/config.ts):

1. If `EXPO_PUBLIC_API_URL` is set, it wins (use this to target a **deployed**
   backend, e.g. the Render URL).
2. Otherwise the app derives the host from the machine serving the Expo bundle
   (`Constants.expoConfig.hostUri`, e.g. `192.168.x.x:8081`) and points at that
   host on **port 8000** — so a phone on the same WiFi reaches the dev API with
   no configuration.

```bash
# Target a deployed API instead of the local machine:
EXPO_PUBLIC_API_URL=https://p2p-api-xxxx.onrender.com npx expo start
```

## Project structure

File-based routing (Expo Router) with feature-sliced business code.

```
mobile/
├── app.json                 # Expo config (SDK 54)
├── src/
│   ├── app/                 # ROUTES (Expo Router)
│   │   ├── (public)/        # unauthenticated screens (auth, landing)
│   │   ├── (app)/           # authenticated app (tabs, deals, wallet, admin…)
│   │   └── join/            # join-a-deal-by-code screens
│   ├── features/            # marketplace, escrow, wallet, messages, seller,
│   │                        #   user, admin, dashboard, notifications, auth, upload…
│   ├── components/          # shared UI (ui/) and brand assets (brand/)
│   ├── context/             # app-wide providers (auth, theme, query…)
│   ├── constants/           # theme tokens, config constants
│   ├── hooks/               # reusable hooks
│   └── types/               # shared types
├── assets/                  # icons, splash, fonts
└── android/                 # native Android project (generated; build output gitignored)
```

## Deep links & payment returns

The app registers a URL scheme (see `app.json`) so external payment providers can
return the buyer to the right screen after paying — the flow that used to strand
a buyer behind a completed Paystack/NOWPayments payment now lands them back on the
deal. Deals are also joinable by share code via the `join/` routes.

## Theme

A persistent light/dark theme toggle is provided via the app's theme context and
survives restarts.

## Status

Auth, marketplace, checkout, the deal lifecycle (deliver → release → review),
wallet, messaging, and the admin views are wired to the real API and share the
web client's behaviour. Remaining gaps track the project roadmap in
[../NEXT-STEPS.md](../NEXT-STEPS.md).
