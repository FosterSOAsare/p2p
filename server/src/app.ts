import express from "express";
import helmet from "helmet";
import cors from "cors";
import { isAllowedOrigin } from "./shared/config/cors";
import { errorHandler, notFoundHandler } from "./shared/middleware/error.middleware";
import { healthRouter } from "./features/health/health.router";
import { authRouter } from "./features/auth/auth.router";
import { usersRouter } from "./features/users/users.router";
import { kycRouter } from "./features/kyc/kyc.router";
import { adminRouter } from "./features/admin/admin.router";
import { categoriesRouter, listingsRouter } from "./features/listings/listings.router";
import { messagesRouter } from "./features/messages/messages.router";
import { walletRouter } from "./features/wallet/wallet.router";
import { paystackWebhook } from "./features/wallet/wallet.controller";
import { escrowsRouter } from "./features/escrows/escrows.router";
import { uploadRouter } from "./features/upload/upload.router";

export function createApp() {
  const app = express();

  app.use(helmet());

  // CORS: shared rule (see shared/config/cors.ts) so the WebSocket handshake
  // accepts exactly the same origins as the REST API.
  app.use(
    cors({
      origin(origin, cb) {
        // clean rejection (no CORS headers) rather than a 500
        cb(null, isAllowedOrigin(origin));
      },
    }),
  );

  // Paystack webhook needs the RAW body for HMAC signature verification, so it
  // is mounted before the JSON parser with its own raw parser.
  app.post("/api/wallet/webhook/paystack", express.raw({ type: "*/*" }), paystackWebhook);

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
  app.use("/api/upload", uploadRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
