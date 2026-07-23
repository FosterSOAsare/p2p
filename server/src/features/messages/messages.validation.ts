import Joi from "joi";
import type { RequestSchema } from "../../shared/middleware/validate.middleware";

const usernameParam = Joi.object({
  username: Joi.string()
    .lowercase()
    .pattern(/^[a-z0-9_]{3,20}$/)
    .required(),
});

export const thread: RequestSchema = {
  params: usernameParam,
};

export const send: RequestSchema = {
  params: usernameParam,
  body: Joi.object({
    body: Joi.string().trim().min(1).max(2000).required(),
  }),
};
