import { Router } from "express";
import { auth } from "../../shared/middleware/auth.middleware";
import { validate } from "../../shared/middleware/validate.middleware";
import * as authController from "./auth.controller";
import * as authValidation from "./auth.validation";

export const authRouter = Router();

authRouter.post("/signup", validate(authValidation.signup), authController.signup);
authRouter.post("/login", validate(authValidation.login), authController.login);
authRouter.post("/refresh", validate(authValidation.refresh), authController.refresh);
authRouter.post("/logout", validate(authValidation.logout), authController.logout);
authRouter.get("/username-available", validate(authValidation.usernameAvailable), authController.usernameAvailable);

authRouter.post("/verify-email", validate(authValidation.verifyEmail), authController.verifyEmail);
authRouter.post("/resend-verification", auth, authController.resendVerification);

authRouter.post("/forgot-password", validate(authValidation.forgotPassword), authController.forgotPassword);
authRouter.post("/reset-password", validate(authValidation.resetPassword), authController.resetPassword);
authRouter.post("/change-password", auth, validate(authValidation.changePassword), authController.changePassword);

authRouter.get("/me", auth, authController.me);
