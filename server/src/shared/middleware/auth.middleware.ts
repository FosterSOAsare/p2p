import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { ApiError } from "../lib/errors";
import { prisma } from "../lib/prisma";
import type { JwtPayload } from "../../features/auth/auth.model";

/**
 * Reads the Bearer token from the Authorization header, verifies it,
 * then loads the user's details from the DB and attaches them as req.user.
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

    // Get fresh user details from the DB — don't trust stale token claims.
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw ApiError.unauthorized("Account no longer exists");
    if (user.status === "suspended") throw ApiError.forbidden("Account suspended");

    req.user = { id: user.id, username: user.username, role: user.role };

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

/** Use after auth() on seller-only routes (listing management): admins pass, otherwise KYC must be verified. */
export async function requireSeller(req: Request, _res: Response, next: NextFunction) {
  try {
    if (req.user?.role === "admin") return next();
    const kyc = await prisma.kycProfile.findUnique({
      where: { userId: req.user!.id },
      select: { status: true },
    });
    if (kyc?.status !== "verified") {
      throw ApiError.forbidden("Verified sellers only — complete seller verification to manage listings");
    }
    next();
  } catch (err) {
    next(err);
  }
}
