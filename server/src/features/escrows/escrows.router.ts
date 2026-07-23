import { Router } from "express";
import { auth } from "../../shared/middleware/auth.middleware";
import { validate } from "../../shared/middleware/validate.middleware";
import * as escrowsController from "./escrows.controller";
import * as escrowsValidation from "./escrows.validation";

export const escrowsRouter = Router();

// Public share-link preview (join screen) — before auth
escrowsRouter.get("/code/:code", validate(escrowsValidation.codeParam), escrowsController.getPublicByCode);

escrowsRouter.use(auth);

// Checkout: payment moment → escrow born funded, seller notified
escrowsRouter.post("/from-listing", validate(escrowsValidation.checkout), escrowsController.checkout);

// Standalone deals
escrowsRouter.post("/", validate(escrowsValidation.createStandalone), escrowsController.createStandalone);
escrowsRouter.post("/code/:code/accept", validate(escrowsValidation.codeParam), escrowsController.acceptByCode);

escrowsRouter.get("/", validate(escrowsValidation.list), escrowsController.list);
escrowsRouter.get("/:id", validate(escrowsValidation.idParam), escrowsController.getDetail);

// State transitions — one endpoint per event, guarded by the machine
escrowsRouter.post("/:id/fund", validate(escrowsValidation.idParam), escrowsController.fund);
escrowsRouter.post("/:id/deliver", validate(escrowsValidation.deliver), escrowsController.deliver);
escrowsRouter.post("/:id/release", validate(escrowsValidation.idParam), escrowsController.release);
escrowsRouter.post("/:id/dispute", validate(escrowsValidation.dispute), escrowsController.dispute);
escrowsRouter.post("/:id/review", validate(escrowsValidation.review), escrowsController.review);
