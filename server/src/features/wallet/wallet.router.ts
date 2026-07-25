import { Router } from "express";
import { auth } from "../../shared/middleware/auth.middleware";
import { validate } from "../../shared/middleware/validate.middleware";
import * as walletController from "./wallet.controller";
import * as walletValidation from "./wallet.validation";

export const walletRouter = Router();

walletRouter.use(auth);

walletRouter.get("/", walletController.getWallet);
walletRouter.post("/deposit", validate(walletValidation.deposit), walletController.deposit);
walletRouter.post("/deposit/init", validate(walletValidation.initDeposit), walletController.initDeposit);
walletRouter.get("/deposit/verify/:reference", validate(walletValidation.verifyDeposit), walletController.verifyDeposit);
walletRouter.post("/withdraw", validate(walletValidation.withdraw), walletController.withdraw);
walletRouter.get("/transactions", validate(walletValidation.transactions), walletController.transactions);
