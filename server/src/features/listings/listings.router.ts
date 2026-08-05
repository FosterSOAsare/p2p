import { Router } from "express";
import { auth, optionalAuth, requireSeller } from "../../shared/middleware/auth.middleware";
import { validate } from "../../shared/middleware/validate.middleware";
import * as listingsController from "./listings.controller";
import * as listingsValidation from "./listings.validation";

export const listingsRouter = Router();

// ---- Public browse ----
listingsRouter.get("/", validate(listingsValidation.list), listingsController.list);

// ---- Seller/admin management (regular users are 403'd by requireSeller) ----
// "/mine" registered before "/:id" so it isn't swallowed by the param route.
listingsRouter.get("/mine", auth, requireSeller, validate(listingsValidation.mineQuery), listingsController.mine);
listingsRouter.post("/", auth, requireSeller, validate(listingsValidation.create), listingsController.create);
listingsRouter.patch("/:id", auth, requireSeller, validate(listingsValidation.update), listingsController.update);
listingsRouter.delete("/:id", auth, requireSeller, validate(listingsValidation.idParam), listingsController.remove);

// Appeal a takedown (owner only; the service checks eligibility)
listingsRouter.post("/:id/dispute", auth, validate(listingsValidation.dispute), listingsController.submitDispute);

// Flag a listing. `auth`, not `requireSeller`: reporting is a buyer's job.
listingsRouter.post("/:id/report", auth, validate(listingsValidation.report), listingsController.submitReport);

// ---- Public detail (after /mine) ----
// optionalAuth so the owner/an admin can still open their own removed listing.
listingsRouter.get("/:id", optionalAuth, validate(listingsValidation.idParam), listingsController.getById);

export const categoriesRouter = Router();

categoriesRouter.get("/", listingsController.listCategories);
