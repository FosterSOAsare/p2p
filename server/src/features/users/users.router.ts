import { Router } from "express";
import { auth } from "../../shared/middleware/auth.middleware";
import { validate } from "../../shared/middleware/validate.middleware";
import * as usersController from "./users.controller";
import * as usersValidation from "./users.validation";

export const usersRouter = Router();

// Every route in this feature requires a signed-in user.
usersRouter.use(auth);

usersRouter.patch("/me", validate(usersValidation.updateMe), usersController.updateMe);
usersRouter.put("/me/notification-prefs", validate(usersValidation.notificationPrefs), usersController.updateNotificationPrefs);

usersRouter.get("/me/saved", usersController.getSavedListings);
usersRouter.post("/me/saved/:listingId", validate(usersValidation.savedListingParam), usersController.saveListing);
usersRouter.delete("/me/saved/:listingId", validate(usersValidation.savedListingParam), usersController.unsaveListing);
