import { Router } from "express";
import { auth } from "../../shared/middleware/auth.middleware";
import { validate } from "../../shared/middleware/validate.middleware";
import * as messagesController from "./messages.controller";
import * as messagesValidation from "./messages.validation";

export const messagesRouter = Router();

messagesRouter.use(auth);

messagesRouter.get("/", messagesController.listConversations);
messagesRouter.get("/:username", validate(messagesValidation.thread), messagesController.getThread);
messagesRouter.post("/:username", validate(messagesValidation.send), messagesController.sendMessage);
messagesRouter.post("/:username/read", validate(messagesValidation.thread), messagesController.markRead);
