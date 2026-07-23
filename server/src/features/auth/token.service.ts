import { createHash, randomBytes } from "node:crypto";
import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../../shared/config/env";
import type { JwtPayload } from "./auth.model";

/** Signs a short-lived access JWT (verified by the auth middleware). */
export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_TTL as SignOptions["expiresIn"],
  });
}

/**
 * Refresh tokens are opaque random strings — only their SHA-256 hash is stored
 * (a DB leak doesn't leak usable tokens).
 */
export function generateRefreshToken(): { token: string; hash: string } {
  const token = randomBytes(48).toString("base64url");
  return { token, hash: hashRefreshToken(token) };
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Parses TTLs like "30d" / "12h" / "15m" / "45s" into milliseconds. */
export function refreshTtlMs(): number {
  const match = /^(\d+)([smhd])$/.exec(env.JWT_REFRESH_TTL);
  if (!match) return 30 * 24 * 60 * 60_000; // default 30d
  const value = Number(match[1]);
  const unit = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2] as "s" | "m" | "h" | "d"];
  return value * unit;
}
