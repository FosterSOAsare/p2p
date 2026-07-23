import express from "express";
import helmet from "helmet";
import cors from "cors";
import {env} from "./shared/config/env"
import { errorHandler, notFoundHandler } from "./shared/middleware/error.middleware";
import { healthRouter } from "./features/health/health.router";
import { authRouter } from "./features/auth/auth.router";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.WEB_ORIGIN }));
  app.use(express.json({ limit: "1mb" }));

  app.use("/health", healthRouter);
  app.use("/api/auth", authRouter);
  // Next feature modules mount here:
  // app.use("/api/escrow", escrowRouter);
  // app.use("/api/admin", adminRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
