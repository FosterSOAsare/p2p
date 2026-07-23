# Deployment

TaaS is a monorepo: the **web** app (Next.js) deploys to Vercel, and the **API**
(NestJS + workers) runs as a Docker service. All the managed services below have
free tiers suitable for the project demo.

| Component | Service | Notes |
|---|---|---|
| Web (Next.js) | **Vercel** | Root dir `apps/web`; set `API_ORIGIN` + `NEXT_PUBLIC_API_ORIGIN` to the API URL |
| API + workers | **Render** (Docker) | Uses `apps/api/Dockerfile` + `render.yaml`; runs migrations on boot |
| Database | **Neon** (Postgres) | Copy the pooled connection string into `DATABASE_URL` |
| Redis (BullMQ) | **Upstash** | Copy the `rediss://` URL into `REDIS_URL` |
| Object storage | **Cloudflare R2** | S3-compatible; set `S3_*` vars, keep the KYC bucket private |
| Email | **Resend** or SES | Set `SMTP_*`; swap Mailpit for the provider |
| Payments | **Paystack** (test) | `PAYSTACK_SECRET_KEY`; add the webhook `/api/payments/webhook/paystack` |
| Crypto | **TRON Shasta** via TronGrid | `TRON_FULL_HOST`, optional `TRONGRID_API_KEY` |

## Steps

1. **Database** — create a Neon project, copy the connection string.
2. **Redis** — create an Upstash database, copy the `rediss://` URL.
3. **API (Render)** — "New → Blueprint", point at this repo. `render.yaml` provisions
   the Docker service; fill the `sync: false` env vars (DB, Redis, secrets, R2, SMTP).
   The container runs `prisma migrate deploy` then starts, so the schema is applied
   automatically. Seed once from a shell: `pnpm --filter @taas/api db:seed`.
4. **Web (Vercel)** — import the repo, set **Root Directory** to `apps/web`, and add
   `API_ORIGIN` / `NEXT_PUBLIC_API_ORIGIN` = the Render API URL. Build command
   `pnpm --filter @taas/web build` (Vercel auto-detects Next.js + pnpm workspaces).
5. **CORS / origins** — set `WEB_ORIGIN` on the API to the Vercel URL so cookies and
   the Socket.IO gateway accept it.
6. **Webhooks** — add the Paystack webhook URL in the Paystack dashboard.

## Local production build check

```bash
docker build -f apps/api/Dockerfile -t taas-api .
pnpm --filter @taas/web build
```

## Environment reference

See `apps/api/.env.example` for the full variable list. Never commit real secrets —
`.env` is gitignored; Render/Vercel inject them at runtime.

## Not production-ready as-is

This is an academic build. Before real custody of funds or live crypto, TaaS needs a
Bank of Ghana PSP/EMI licence and VASP registration (see
[07-kyc-compliance.md](07-kyc-compliance.md)). It runs on payment-provider test mode
and blockchain testnet only.
