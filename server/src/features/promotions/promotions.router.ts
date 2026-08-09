import { Router } from "express";
import { auth, requireSeller } from "../../shared/middleware/auth.middleware";
import { validate } from "../../shared/middleware/validate.middleware";
import * as promotionsController from "./promotions.controller";
import * as promotionsValidation from "./promotions.validation";

export const promotionsRouter = Router();

// Every route is seller-scoped: promotions cost money and the charge lands on
// the caller's wallet, so there is nothing here to expose publicly.
promotionsRouter.use(auth, requireSeller);

// Static paths before "/:id/..." so they aren't swallowed by the param routes.
promotionsRouter.get("/metrics", promotionsController.getMetrics);
promotionsRouter.get("/quote", validate(promotionsValidation.quote), promotionsController.quote);
promotionsRouter.get("/mine", validate(promotionsValidation.listQuery), promotionsController.mine);

promotionsRouter.post("/", validate(promotionsValidation.launch), promotionsController.launch);
promotionsRouter.post("/:id/pause", validate(promotionsValidation.idParam), promotionsController.pause);
promotionsRouter.post("/:id/resume", validate(promotionsValidation.idParam), promotionsController.resume);
promotionsRouter.post("/:id/cancel", validate(promotionsValidation.idParam), promotionsController.cancel);
