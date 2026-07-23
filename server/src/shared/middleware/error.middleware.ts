import type { NextFunction, Request, Response } from "express";
import Joi from "joi";
import { ApiError } from "../lib/errors";
import { env } from "../config/env";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    res.status(err.status).json({ error: err.message, details: err.details });
    return;
  }

  // Joi errors thrown outside the validate() middleware (e.g. inside a service)
  if (Joi.isError(err)) {
    res.status(400).json({ error: "Validation failed", details: err.details.map((d) => d.message) });
    return;
  }

  console.error("Unhandled error:", err);
  res.status(500).json({
    error: "Internal server error",
    ...(env.NODE_ENV !== "production" && err instanceof Error ? { details: err.message } : {}),
  });
}
