import { Router } from "express";
import { auth } from "../../shared/middleware/auth.middleware";
import { validate } from "../../shared/middleware/validate.middleware";
import * as usersController from "./users.controller";
import * as usersValidation from "./users.validation";

export const usersRouter = Router();

// Public seller profile — registered BEFORE the auth gate.
// ("me" can never collide: usernames are 3+ chars and this only matches GET.)
usersRouter.get("/:username", validate(usersValidation.usernameParam), usersController.getPublicProfile);

// Everything below requires a signed-in user.
usersRouter.use(auth);

usersRouter.patch("/me", validate(usersValidation.updateMe), usersController.updateMe);
usersRouter.put("/me/notification-prefs", validate(usersValidation.notificationPrefs), usersController.updateNotificationPrefs);

usersRouter.get("/me/blocked", usersController.listBlockedVendors);
usersRouter.post("/:username/block", validate(usersValidation.blockVendor), usersController.blockVendor);
usersRouter.delete("/:username/block", validate(usersValidation.usernameParam), usersController.unblockVendor);

usersRouter.get("/me/dashboard", usersController.getDashboard);
usersRouter.get("/me/saved", usersController.getSavedListings);
usersRouter.post("/me/saved/:listingId", validate(usersValidation.savedListingParam), usersController.saveListing);
usersRouter.delete("/me/saved/:listingId", validate(usersValidation.savedListingParam), usersController.unsaveListing);

