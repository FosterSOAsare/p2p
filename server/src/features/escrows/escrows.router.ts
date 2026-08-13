import { Router } from "express";
import { auth } from "../../shared/middleware/auth.middleware";
import { validate } from "../../shared/middleware/validate.middleware";
import * as escrowsController from "./escrows.controller";
import * as escrowsValidation from "./escrows.validation";

export const escrowsRouter = Router();

// Public share-link preview (join screen) — before auth
escrowsRouter.get("/code/:code", validate(escrowsValidation.codeParam), escrowsController.getPublicByCode);

// NOWPayments IPN — also before auth: the provider carries no session, its
// HMAC signature is the credential. Not validated by Joi either, since the
// payload has to reach the verifier byte-for-key exactly as it was signed.
escrowsRouter.post("/webhook/nowpayments", escrowsController.nowpaymentsWebhook);

escrowsRouter.use(auth);

// Checkout: payment moment → escrow born funded, seller notified
escrowsRouter.post("/from-listing", validate(escrowsValidation.checkout), escrowsController.checkout);

// Standalone deals
escrowsRouter.post("/", validate(escrowsValidation.createStandalone), escrowsController.createStandalone);
escrowsRouter.post("/code/:code/accept", validate(escrowsValidation.codeParam), escrowsController.acceptByCode);

escrowsRouter.get("/", validate(escrowsValidation.list), escrowsController.list);
// No separate /qr route — the share QR rides along on the detail response,
// which is the request the deal page already makes (see getDetail).
escrowsRouter.get("/:id", validate(escrowsValidation.idParam), escrowsController.getDetail);
escrowsRouter.patch("/:id", validate(escrowsValidation.updateDeal), escrowsController.updateDeal);

// State transitions — one endpoint per event, guarded by the machine
escrowsRouter.post("/:id/fund", validate(escrowsValidation.idParam), escrowsController.fund);
escrowsRouter.post("/:id/deliver", validate(escrowsValidation.deliver), escrowsController.deliver);
escrowsRouter.post("/:id/release", validate(escrowsValidation.idParam), escrowsController.release);
escrowsRouter.post("/:id/cancel", validate(escrowsValidation.cancel), escrowsController.cancel);
escrowsRouter.post("/:id/dispute", validate(escrowsValidation.dispute), escrowsController.dispute);
escrowsRouter.post("/:id/review", validate(escrowsValidation.review), escrowsController.review);

// Crypto rail — funding a TRX deal is a deposit to the provider, not a FUND
// event we accept from the buyer, so it sits outside the transitions above.
escrowsRouter.post("/:id/crypto/start", validate(escrowsValidation.idParam), escrowsController.cryptoStart);
escrowsRouter.get("/:id/crypto", validate(escrowsValidation.idParam), escrowsController.cryptoStatus);
escrowsRouter.post("/:id/crypto/check", validate(escrowsValidation.cryptoCheck), escrowsController.cryptoCheck);
