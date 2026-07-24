import { Router } from "express";
import { auth, requireAdmin } from "../../shared/middleware/auth.middleware";
import { validate } from "../../shared/middleware/validate.middleware";
import * as adminController from "./admin.controller";
import * as adminValidation from "./admin.validation";

export const adminRouter = Router();

// Every admin route: signed in + admin role.
adminRouter.use(auth, requireAdmin);

adminRouter.get("/kyc", validate(adminValidation.kycList), adminController.listKyc);
adminRouter.get("/kyc/:id", validate(adminValidation.kycParam), adminController.getKyc);
adminRouter.post("/kyc/:id/approve", validate(adminValidation.kycParam), adminController.approveKyc);
adminRouter.post("/kyc/:id/reject", validate(adminValidation.kycReject), adminController.rejectKyc);

adminRouter.get("/disputes", validate(adminValidation.disputeList), adminController.listDisputes);
adminRouter.get("/disputes/:id", validate(adminValidation.disputeParam), adminController.getDispute);
adminRouter.post("/disputes/:id/resolve", validate(adminValidation.disputeResolve), adminController.resolveDispute);
