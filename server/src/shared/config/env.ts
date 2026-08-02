import path from "node:path";
import dotenv from "dotenv";
import { resolveLanIp } from "../lib/net";

dotenv.config({ path: path.resolve(__dirname, "../../../.env"), quiet: true });

const WEB_PORT = process.env.WEB_PORT ?? "5173";
// When WEB_ORIGIN isn't set, point email links at the machine's current LAN IP
// so they're clickable from a phone on the same WiFi — re-detected each startup,
// so it follows the network automatically (no hardcoded IP to go stale).
const detectedWebOrigin = `http://${resolveLanIp() ?? "localhost"}:${WEB_PORT}`;

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: Number(process.env.PORT ?? 4000),
  DATABASE_URL: process.env.DATABASE_URL ?? "",
  // Primary web origin — used to build links in emails. Auto-detected if unset.
  WEB_ORIGIN: process.env.WEB_ORIGIN ?? detectedWebOrigin,
  // Explicit allow-list for CORS (comma-separated). In development, localhost and
  // private-LAN origins are always allowed on top of this (see app.ts), so this
  // usually only matters in production.
  CORS_ORIGINS: (process.env.CORS_ORIGINS ?? process.env.WEB_ORIGIN ?? detectedWebOrigin)
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET ?? "",
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET ?? "",
  JWT_ACCESS_TTL: process.env.JWT_ACCESS_TTL ?? "15m",
  JWT_REFRESH_TTL: process.env.JWT_REFRESH_TTL ?? "30d",
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME ?? "",
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY ?? "",
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET ?? "",
  CLOUDINARY_URL: process.env.CLOUDINARY_URL ?? "",

  // Paystack (test mode). Deposits are real charges against test cards/momo;
  // the webhook (HMAC-SHA512 verified) or the /verify poll credits the wallet.
  // Leave the secret blank to fall back to the instant simulated deposit.
  PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY ?? "",
  PAYSTACK_PUBLIC_KEY: process.env.PAYSTACK_PUBLIC_KEY ?? "",
  // Where Paystack returns the buyer after payment (frontend route).
  PAYSTACK_CALLBACK_URL: (() => {
    const url = process.env.PAYSTACK_CALLBACK_URL ?? "";
    const isDev = (process.env.NODE_ENV ?? "development") !== "production";
    if (isDev && url.includes("localhost:")) {
      const origin = process.env.WEB_ORIGIN ?? detectedWebOrigin;
      return url.replace(/https?:\/\/localhost:\d+/, origin);
    }
    return url;
  })(),

  // Mail. "simulated" logs `[mail:simulated] To <email>: <subject>` (default);
  // flip to "smtp" + fill SMTP_* and install nodemailer to send for real.
  MAIL_DRIVER: (process.env.MAIL_DRIVER ?? "simulated") as "simulated" | "smtp",
  MAIL_FROM: process.env.MAIL_FROM ?? "P2P Market <no-reply@p2p.market>",
  SMTP_HOST: process.env.SMTP_HOST ?? "",
  SMTP_PORT: Number(process.env.SMTP_PORT ?? 587),
  SMTP_USER: process.env.SMTP_USER ?? "",
  SMTP_PASS: process.env.SMTP_PASS ?? "",
};

// Fail fast on boot instead of running on empty defaults. An unset JWT secret
// is the dangerous one: jsonwebtoken happily signs and verifies with "", so the
// app would look healthy while every token was trivially forgeable. DATABASE_URL
// is here too — the Prisma adapter is built from it at import time.
const REQUIRED = ["DATABASE_URL", "JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"] as const;
const missing = REQUIRED.filter((key) => !env[key]);
if (missing.length > 0) {
  throw new Error(
    `Missing required environment variable(s): ${missing.join(", ")}. ` +
      `Set them in server/.env before starting the API.`,
  );
}

/** True once a Paystack TEST secret is configured. Restricted to test keys on
 *  purpose — the platform is test-mode only, so a mis-pasted live key must not
 *  silently process real charges. */
export const paystackEnabled = () => env.PAYSTACK_SECRET_KEY.startsWith("sk_test_");
