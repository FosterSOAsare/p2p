import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { ApiError } from "../lib/errors";
import { getAuthUser } from "../lib/auth-cache";
import type { JwtPayload } from "../../features/auth/auth.model";

/**
 * Reads the Bearer token from the Authorization header, verifies it,
 * then loads the user's details and attaches them as req.user.
 *
 * The lookup goes through `auth-cache` rather than straight to Postgres. It was
 * a full round trip on every authenticated request — the largest single fixed
 * cost in the app on this connection. See that module for the staleness trade.
 */
export async function auth(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw ApiError.unauthorized("Authentication required");
    }

    const token = header.slice("Bearer ".length);
    let payload: JwtPayload;
    try {
      payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
    } catch {
      throw ApiError.unauthorized("Invalid or expired token");
    }

    // Don't trust stale token claims — but don't re-read Postgres for every
    // request either; `getAuthUser` serves a few-second-old row.
    const user = await getAuthUser(payload.sub);
    if (!user) throw ApiError.unauthorized("Account no longer exists");
    if (user.status === "suspended") throw ApiError.forbidden("Account suspended");

    req.user = { id: user.id, username: user.username, role: user.role };
    // Stashed so requireSeller doesn't need a second lookup for the same fact.
    req.authKycStatus = user.kycStatus;

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Attaches req.user when a valid token is present but never rejects — for public
 * routes that reveal a little more to the right viewer (e.g. a seller opening
 * their own removed listing).
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.headers.authorization?.startsWith("Bearer ")) return next();
  // A bad/expired token just means "anonymous" here — never an error.
  await auth(req, res, () => next());
}

/** Use after auth() on admin-only routes. */
export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== "admin") return next(ApiError.forbidden("Admin access required"));
  next();
}

/**
 * Use after auth() on seller-only routes (listing management): admins pass,
 * otherwise KYC must be verified.
 *
 * Synchronous now. `auth` already loaded the KYC status alongside the user, so
 * this was a second full round trip for a fact the previous middleware had
 * just had in its hands — it doubled the fixed cost of every seller route.
 */
export function requireSeller(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role === "admin") return next();
  if (req.authKycStatus !== "verified") {
    return next(
      ApiError.forbidden("Verified sellers only — complete seller verification to manage listings"),
    );
  }
  next();
}
