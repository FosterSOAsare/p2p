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

/** Use after auth() on admin-only routes. */
export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== "admin") return next(ApiError.forbidden("Admin access required"));
  next();
}
