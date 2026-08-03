import { Router } from "express";
import { auth } from "../../shared/middleware/auth.middleware";
import { validate } from "../../shared/middleware/validate.middleware";
import * as notificationsController from "./notifications.controller";
import * as notificationsValidation from "./notifications.validation";

export const notificationsRouter = Router();

notificationsRouter.use(auth);

notificationsRouter.get("/", validate(notificationsValidation.list), notificationsController.list);
// Before /:id/read only for readability — the two can't collide (one segment vs two).
notificationsRouter.post("/read-all", notificationsController.markAllRead);
notificationsRouter.post(
  "/:id/read",
  validate(notificationsValidation.byId),
  notificationsController.markRead,
);
