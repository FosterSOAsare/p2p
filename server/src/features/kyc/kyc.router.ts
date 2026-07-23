import { Router } from "express";
import { auth } from "../../shared/middleware/auth.middleware";
import { validate } from "../../shared/middleware/validate.middleware";
import * as kycController from "./kyc.controller";
import * as kycValidation from "./kyc.validation";

export const kycRouter = Router();

kycRouter.use(auth);

kycRouter.post("/", validate(kycValidation.submit), kycController.submit);
kycRouter.get("/me", kycController.getMine);
