import express from "express";
import helmet from "helmet";
import cors from "cors";
import {env} from "./shared/config/env"
import { errorHandler, notFoundHandler } from "./shared/middleware/error.middleware";
import { healthRouter } from "./features/health/health.router";
import { authRouter } from "./features/auth/auth.router";
import { usersRouter } from "./features/users/users.router";
import { kycRouter } from "./features/kyc/kyc.router";
import { adminRouter } from "./features/admin/admin.router";
import { categoriesRouter, listingsRouter } from "./features/listings/listings.router";
import { messagesRouter } from "./features/messages/messages.router";
import { walletRouter } from "./features/wallet/wallet.router";
import { escrowsRouter } from "./features/escrows/escrows.router";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.WEB_ORIGIN }));
  app.use(express.json({ limit: "1mb" }));

  app.use("/health", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/kyc", kycRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/listings", listingsRouter);
  app.use("/api/categories", categoriesRouter);
  app.use("/api/messages", messagesRouter);
  app.use("/api/wallet", walletRouter);
  app.use("/api/escrows", escrowsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
