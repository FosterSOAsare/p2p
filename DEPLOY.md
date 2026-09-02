# Deploying VeriTrust

Three pieces, two of them new:

| piece    | host                    | why                                                              |
| -------- | ----------------------- | ---------------------------------------------------------------- |
| database | Neon, `eu-central-1`    | already live                                                      |
| API      | Render, **Frankfurt**   | long-lived process — Socket.IO needs a real server, not a lambda   |
| web      | Vercel                  | static Vite build behind a CDN                                     |

## The one thing not to get wrong

**Put the API in Frankfurt.** The database is there, and every request is
several round trips to it. Measured from each region:

```
eu-central-1  129ms per round trip
us-east-2     224ms
```

The dashboard alone is two of those. Render defaults to Oregon, which would put
an ocean between the API and its database and undo the reason the database was
moved in the first place. `render.yaml` pins `region: frankfurt`; if you create
the service by hand instead, set it there.

## Order matters

The web needs the API's URL, and the API needs the web's URL for CORS. Neither
exists before its service is created, so it takes two passes:

**1. API on Render.** New → Blueprint, point it at this repo; it reads
`render.yaml`. Render prompts for every `sync: false` variable — take
`DATABASE_URL` and the two JWT secrets from `server/.env`, and leave the origin
ones blank for now. It will deploy and fail its health check. That is expected;
it has no CORS origins yet. Note the URL it gives you
(`https://p2p-api-xxxx.onrender.com`).

**2. Web on Vercel.** New Project → this repo → set **Root Directory to `web`**.
Vercel reads `web/vercel.json` for the rest. Add one environment variable:

```
VITE_API_URL = https://p2p-api-xxxx.onrender.com
```

Deploy, and note the URL (`https://p2p-xxxx.vercel.app`).

**3. Back to Render** and fill in the three origins, then redeploy:

```
WEB_ORIGIN     = https://p2p-xxxx.vercel.app
CORS_ORIGINS   = https://p2p-xxxx.vercel.app
SERVER_ORIGIN  = https://p2p-api-xxxx.onrender.com
```

`CORS_ORIGINS` takes a comma-separated list if you later add a custom domain or
want preview deploys to work. In production nothing outside it is accepted — the
LAN allowance in `shared/config/cors.ts` is development-only, deliberately.

`SERVER_ORIGIN` is this API's own public URL. NOWPayments posts its IPN there;
until it is set, a crypto deposit can only settle from the buyer's redirect.

## Check it worked

```bash
curl https://p2p-api-xxxx.onrender.com/health
```

Then open the web app and sign in. If the browser console shows a CORS error,
`CORS_ORIGINS` does not exactly match the origin the browser sent — scheme and
host must both match, and there is no trailing slash.

Chat and live updates ride the same origin rule, so if messages work, the
WebSocket handshake was accepted too.

## Free tier, and what it costs you

Render's free plan **stops the service after 15 minutes without traffic**, and
the next request pays a cold start of roughly 50 seconds while it boots. For a
demo that is usually fine; for anything being marked, it is not, and the first
person to open the app will think it is broken.

Two things follow from that:

- The database keep-alive (`DB_KEEPALIVE_MS`) cannot run while the service is
  asleep, so Neon will scale to zero as well and the first request pays both
  cold starts.
- Pinging the service to keep it awake is against Render's free-tier terms. The
  honest fixes are the paid instance or accepting the cold start.

## Migrations

`buildCommand` runs `prisma migrate deploy` before the build, so a deploy that
carries a new migration applies it before the code that needs it starts serving.
`prisma generate` is in there too and is not optional — `server/src/generated/`
is gitignored, so the client does not exist in a fresh checkout.

## Mobile

Not hosted. The Expo app reads `EXPO_PUBLIC_API_URL`, falling back to the host
serving the bundle (`features/shared/data/config.ts`). Point it at the Render URL
when you build for a device that is not on your network.
