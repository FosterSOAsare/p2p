import { Router } from "express";
import * as healthController from "./health.controller";

export const healthRouter = Router();

healthRouter.get("/", healthController.getHealth);
