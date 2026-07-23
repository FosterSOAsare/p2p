import Joi from "joi";
import type { RequestSchema } from "../../shared/middleware/validate.middleware";

export const deposit: RequestSchema = {
  body: Joi.object({
    amount: Joi.number().positive().max(100_000).required().messages({
      "number.max": "Simulated deposits are capped at GH₵ 100,000",
    }),
  }),
};

export const withdraw: RequestSchema = {
  body: Joi.object({
    amount: Joi.number().positive().max(1_000_000).required(),
    destination: Joi.string()
      .pattern(/^\+?[0-9\s-]{9,15}$/)
      .required()
      .messages({ "string.pattern.base": "Enter a valid mobile money number" }),
  }),
};

export const transactions: RequestSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(15),
  }),
};
