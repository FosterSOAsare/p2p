import Joi from "joi";
import type { RequestSchema } from "../../shared/middleware/validate.middleware";

export const list: RequestSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    // 50 is the panel's ceiling per fetch; it pages from there.
    limit: Joi.number().integer().min(1).max(50).default(20),
  }),
};

export const byId: RequestSchema = {
  params: Joi.object({
    id: Joi.string().trim().max(64).required(),
  }),
};
